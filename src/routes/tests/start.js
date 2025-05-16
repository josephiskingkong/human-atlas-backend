const app = require("../../config/express");
const { colorText, logger } = require("../../config/logger");
const { TestModel } = require("../../db/models/TestModel");
const { QuestionModel } = require("../../db/models/QuestionModel");
const { AnswerModel } = require("../../db/models/AnswerModel");
const { TestSessionModel } = require("../../db/models/TestSessionModel");
const { requireParamFields } = require("../../middlewares/fields");
const { authenticateToken } = require("../users/auth");
const { Sequelize } = require("sequelize");
const { db } = require("../../db/db");

/**
 * Начать прохождение теста
 */
app.post("/v1/tests/:testId/start", authenticateToken, requireParamFields(['testId']), async (req, res) => {
    const transaction = await db.transaction();
    
    try {
        const { testId } = req.params;
        const userId = req.user.id;
        
        // Получаем информацию о тесте
        const test = await TestModel.findByPk(testId);
        if (!test) {
            await transaction.rollback();
            return res.status(404).json({ error: "Test not found" });
        }
        
        // Проверяем, нет ли уже активной сессии для этого теста и пользователя
        const activeSession = await TestSessionModel.findOne({
            where: {
                testId,
                userId,
                status: 'in_progress',
                expiresAt: { [Sequelize.Op.gt]: new Date() }
            }
        });
        
        if (activeSession) {
            await transaction.rollback();
            return res.status(400).json({ 
                error: "Active session exists",
                sessionId: activeSession.id,
                message: "У вас уже есть активная сессия этого теста"
            });
        }
        
        // Создаем новую сессию
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + test.duration);
        
        const session = await TestSessionModel.create({
            testId,
            userId,
            status: 'in_progress',
            startedAt: new Date(),
            expiresAt
        }, { transaction });
        
        // Получаем вопросы для теста, но без правильных ответов
        const questions = await QuestionModel.findAll({
            where: { testId },
            order: [['position', 'ASC']],
            include: [{
                model: AnswerModel,
                attributes: ['id', 'text', 'position'], // Исключаем isCorrect
                order: [['position', 'ASC']]
            }]
        });
        
        if (questions.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ error: "This test has no questions" });
        }
        
        await transaction.commit();
        
        logger.info(`Started test session: User ID=${userId}, Test ID=${testId}, Session ID=${session.id}`);
        
        return res.status(200).json({
            message: "Test session started",
            sessionId: session.id,
            testId,
            title: test.title,
            description: test.description,
            duration: test.duration,
            startedAt: session.startedAt,
            expiresAt: session.expiresAt,
            questions: questions.map(q => ({
                id: q.id,
                text: q.text,
                type: q.type,
                position: q.position,
                answers: q.answers.map(a => ({
                    id: a.id,
                    text: a.text,
                    position: a.position
                }))
            }))
        });
    } catch (e) {
        await transaction.rollback();
        logger.error(`Error starting test: ${colorText(e.message, 'red')}`);
        res.status(500).json({ error: e.message });
    }
});

/**
 * Проверить статус сессии теста
 */
app.get("/v1/tests/sessions/:sessionId", authenticateToken, requireParamFields(['sessionId']), async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.id;
        
        const session = await TestSessionModel.findOne({
            where: { id: sessionId, userId },
            include: [{
                model: TestModel,
                attributes: ['title', 'duration']
            }]
        });
        
        if (!session) {
            return res.status(404).json({ error: "Test session not found" });
        }
        
        // Если сессия истекла, но статус еще не обновлен
        if (session.expiresAt < new Date() && session.status === 'in_progress') {
            await session.update({ status: 'expired' });
        }
        
        return res.status(200).json({
            id: session.id,
            testId: session.testId,
            testTitle: session.test?.title,
            status: session.status,
            startedAt: session.startedAt,
            expiresAt: session.expiresAt,
            remainingTime: Math.max(0, Math.floor((new Date(session.expiresAt) - new Date()) / 1000)) // в секундах
        });
    } catch (e) {
        logger.error(`Error checking session status: ${colorText(e.message, 'red')}`);
        res.status(500).json({ error: e.message });
    }
});