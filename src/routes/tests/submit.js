const app = require("../../config/express");
const { colorText, logger } = require("../../config/logger");
const { TestModel } = require("../../db/models/TestModel");
const { QuestionModel } = require("../../db/models/QuestionModel");
const { AnswerModel } = require("../../db/models/AnswerModel");
const { TestSessionModel } = require("../../db/models/TestSessionModel");
const { UserAnswerModel } = require("../../db/models/UserAnswerModel");
const { TestResultModel } = require("../../db/models/TestResultModel");
const { requireBodyFields, requireParamFields } = require("../../middlewares/fields");
const { authenticateToken } = require("../users/auth");
const { db } = require("../../db/db");
const { Sequelize } = require("sequelize");

/**
 * Отправка ответа на вопрос
 */
app.post("/v1/tests/sessions/:sessionId/answer", authenticateToken, 
    requireParamFields(['sessionId']), requireBodyFields(['questionId']), 
    async (req, res) => {
        const transaction = await db.transaction();
        
        try {
            const { sessionId } = req.params;
            const { questionId, answerIds, textAnswer } = req.body;
            const userId = req.user.id;
            
            // Проверяем активность сессии
            const session = await TestSessionModel.findOne({
                where: {
                    id: sessionId,
                    userId,
                    status: 'in_progress',
                    expiresAt: { [Sequelize.Op.gt]: new Date() }
                }
            });
            
            if (!session) {
                await transaction.rollback();
                return res.status(400).json({ 
                    error: "Invalid session",
                    message: "Сессия не найдена, истекла или уже завершена"
                });
            }
            
            // Получаем информацию о вопросе
            const question = await QuestionModel.findOne({
                where: { id: questionId, testId: session.testId },
                include: [{
                    model: AnswerModel,
                    where: { isCorrect: true },
                    required: false
                }]
            });
            
            if (!question) {
                await transaction.rollback();
                return res.status(404).json({ error: "Question not found in this test" });
            }
            
            // Проверяем, не был ли уже отправлен ответ
            const existingAnswer = await UserAnswerModel.findOne({
                where: { sessionId, questionId }
            });
            
            if (existingAnswer) {
                await transaction.rollback();
                return res.status(400).json({ error: "Answer already submitted for this question" });
            }
            
            // Проверяем правильность ответа
            let isCorrect = false;
            
            if (question.type === 'text_input') {
                // Текстовый ответ можно проверить по точному соответствию с правильным ответом
                const correctAnswer = question.answers.length > 0 ? question.answers[0].text.toLowerCase() : '';
                isCorrect = textAnswer && correctAnswer === textAnswer.toLowerCase();
            } else if (question.type === 'single_choice' || question.type === 'multiple_choice') {
                // Для одиночного или множественного выбора
                if (!Array.isArray(answerIds) || answerIds.length === 0) {
                    isCorrect = false;
                } else {
                    // Получаем все правильные ответы для этого вопроса
                    const correctAnswerIds = question.answers.map(a => a.id);
                    
                    // Для одиночного выбора должен быть выбран только один правильный ответ
                    if (question.type === 'single_choice') {
                        isCorrect = answerIds.length === 1 && correctAnswerIds.includes(answerIds[0]);
                    } 
                    // Для множественного выбора все выбранные должны быть правильными и все правильные должны быть выбраны
                    else {
                        const allSelectedAreCorrect = answerIds.every(id => correctAnswerIds.includes(id));
                        const allCorrectAreSelected = correctAnswerIds.every(id => answerIds.includes(id));
                        isCorrect = allSelectedAreCorrect && allCorrectAreSelected;
                    }
                }
            }
            
            // Сохраняем ответ пользователя
            await UserAnswerModel.create({
                sessionId,
                questionId,
                answerIds: answerIds || [],
                textAnswer,
                isCorrect
            }, { transaction });
            
            await transaction.commit();
            
            logger.info(`User ID=${userId} submitted answer for question ID=${questionId}, session ID=${sessionId}, isCorrect=${isCorrect}`);
            
            return res.status(200).json({
                message: "Answer submitted",
                isCorrect
            });
        } catch (e) {
            await transaction.rollback();
            logger.error(`Error submitting answer: ${colorText(e.message, 'red')}`);
            res.status(500).json({ error: e.message });
        }
    }
);

/**
 * Завершение теста
 */
app.post("/v1/tests/sessions/:sessionId/finish", authenticateToken, requireParamFields(['sessionId']), async (req, res) => {
    const transaction = await db.transaction();
    
    try {
        const { sessionId } = req.params;
        const userId = req.user.id;
        
        // Проверяем существование сессии
        const session = await TestSessionModel.findOne({
            where: { id: sessionId, userId },
            include: [{
                model: TestModel,
                attributes: ['id', 'questionCount']
            }]
        });
        
        if (!session) {
            await transaction.rollback();
            return res.status(404).json({ error: "Test session not found" });
        }
        
        if (session.status === 'completed') {
            await transaction.rollback();
            return res.status(400).json({ error: "Test already completed" });
        }
        
        // Получаем ответы пользователя
        const userAnswers = await UserAnswerModel.findAll({
            where: { sessionId }
        });
        
        // Получаем все вопросы теста
        const questions = await QuestionModel.findAll({
            where: { testId: session.testId }
        });
        
        // Подсчитываем результаты
        const totalCount = questions.length;
        const correctCount = userAnswers.filter(a => a.isCorrect).length;
        const incorrectCount = userAnswers.filter(a => !a.isCorrect).length;
        const skippedCount = totalCount - correctCount - incorrectCount;
        const score = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;
        
        // Создаем запись о результате
        const testResult = await TestResultModel.create({
            testId: session.testId,
            userId,
            correctCount,
            incorrectCount,
            skippedCount,
            totalCount,
            score,
            startedAt: session.startedAt,
            finishedAt: new Date()
        }, { transaction });
        
        // Обновляем статус сессии
        await session.update({ status: 'completed' }, { transaction });
        
        await transaction.commit();
        
        logger.info(`User ID=${userId} completed test ID=${session.testId}, session ID=${sessionId}, score=${score}`);
        
        return res.status(200).json({
            message: "Test completed",
            resultId: testResult.id,
            correctCount,
            incorrectCount,
            skippedCount,
            totalCount,
            score,
            startedAt: session.startedAt,
            finishedAt: testResult.finishedAt
        });
    } catch (e) {
        await transaction.rollback();
        logger.error(`Error finishing test: ${colorText(e.message, 'red')}`);
        res.status(500).json({ error: e.message });
    }
});