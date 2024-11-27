const multer = require('multer');
const path = require('path');
const transliterate = require('transliteration').slugify;
const fs = require('fs');
const rawBody = require('raw-body');
const { spawn } = require('child_process');
const { OrganModel } = require('../../db/models/OrganModel');
const app = require('../../config/express');
const { logger, colorText } = require('../../config/logger');
const { convertSvsToTiles, getSvsMetadata } = require('../../service/svs/svs');
const { authenticateToken } = require('../users/auth');

const upload = multer({
    dest: '../../public/organs', 
    limits: { fileSize: 4 * 1024 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (path.extname(file.originalname).toLowerCase() === '.svs') {
            cb(null, true);
        } else {
            cb(new Error('Only .svs files are allowed'), false);
        }
    }
});

/**
 * Эндпоинт для добавления нового органа с загрузкой .svs файла и дальнейшей нарезкой на тайлы
 * 
 * @route POST /v1/organs/add
 * @middleware authRequest - Авторизационный мидлвэйр
 * @middleware upload.single('file') - Мидлвэйр для загрузки одного .svs файла
 * 
 * @param {string} req.body.name - Название органа
 * @param {number} req.body.categoryid - ID категории органа
 * @param {Object} req.file - Загружаемый .svs файл
 * 
 * @description
 * Этот эндпоинт принимает .svs файл, сохраняет его в директории ../../public/organs, и создает переменную synonym, 
 * которая содержит name, переведенное в латиницу, в нижнем регистре и с _ вместо пробелов, без спецсимволов. В дальнейшем
 * по synonym можно будет искать (открывать?) органы
 * 
 * @returns {Object} - JSON объект с сообщением об успешном добавлении и ID нового органа
 */

app.post(
    "/v1/organs/add",
    authenticateToken,
    express.json({ limit: '4096mb' }),
    upload.single('file'),
    async (req, res) => {
      try {
        const { name, categoryid } = req.body;
        const file = req.file;
  
        if (!name || !categoryid || !file) {
          logger.warn("Missing required fields: name, categoryid, or file");
          return res.status(400).send({ error: "Missing required fields: name, categoryid, or file" });
        }
  
        const synonym = transliterate(name, { lowercase: true, separator: '_' }).replace(/[^a-z0-9_]/g, '');
        const targetDir = path.join(__dirname, '../../public/organs');
        const targetPath = path.join(targetDir, `${synonym}.svs`);
        fs.mkdirSync(targetDir, { recursive: true });
        fs.renameSync(file.path, targetPath);
  
        const organ = await OrganModel.create({ name, categoryid, synonym, status: 'PROCESSING' });
  
        res.status(201).json({ message: "success", organ_id: organ.id, name: organ.name, status: organ.status });
  
        (async () => {
          try {
            logger.info(`Organ ${colorText('processing', 'yellow')}: ID=${organ.id}, name="${name}"`);
            const metadata = await getSvsMetadata(targetPath);
  
            await OrganModel.update(
              { mpp_x: metadata.mppX, mpp_y: metadata.mppY, width: metadata.width, height: metadata.height },
              { where: { id: organ.id } }
            );
  
            const organTilesDir = `/var/www/human-atlas-tiles/tiles/${organ.id}`;
            fs.mkdirSync(organTilesDir, { recursive: true });
  
            await convertSvsToTiles(targetPath, `${organTilesDir}/${organ.id}`);
  
            await OrganModel.update({ status: 'DONE' }, { where: { id: organ.id } });
  
            fs.unlink(targetPath, (err) => {
              if (err) logger.warn(`Failed to delete the file: ${targetPath}`);
            });
            logger.info(`Organ ${colorText('processed', 'green')}: ID=${organ.id}, name="${name}"`);
          } catch (error) {
            logger.error(`Error processing organ ID=${organ.id}: ${colorText(error.message, 'red')}`);
            await OrganModel.update({ status: 'ERROR' }, { where: { id: organ.id } });
          }
        })();
      } catch (e) {
        logger.error(`Server error: ${colorText(e.message, 'red')}`);
        return res.status(500).send({ error: "An internal server error occurred" });
      }
    }
  );