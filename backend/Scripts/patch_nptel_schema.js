import db from '../models/acadamic/index.js';

const { sequelize } = db;

const patchSchema = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to DB');

    // 1. Alter NptelCourse to allow null for semesterId and type
    try {
      await sequelize.query('ALTER TABLE NptelCourse MODIFY semesterId INT NULL;');
      console.log('✅ Altered NptelCourse.semesterId to allow NULL');
    } catch (err) {
      console.warn('Note on NptelCourse.semesterId:', err.message);
    }

    try {
      await sequelize.query('ALTER TABLE NptelCourse MODIFY type VARCHAR(20) NULL;');
      console.log('✅ Altered NptelCourse.type to allow NULL');
    } catch (err) {
      console.warn('Note on NptelCourse.type:', err.message);
    }

    // 2. Add creditType to NptelCreditTransfer if not exists
    const [cols] = await sequelize.query("SHOW COLUMNS FROM NptelCreditTransfer LIKE 'creditType';");
    if (!cols || cols.length === 0) {
      await sequelize.query("ALTER TABLE NptelCreditTransfer ADD COLUMN creditType VARCHAR(10) NULL AFTER grade;");
      console.log('✅ Added creditType column to NptelCreditTransfer');
    } else {
      console.log('ℹ️ creditType column already exists in NptelCreditTransfer');
    }

    console.log('🎉 Schema patch completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to patch schema:', error);
    process.exit(1);
  }
};

patchSchema();
