import models from './models/acadamic/index.js';

const runMigration = async () => {
  try {
    console.log('Ensuring CourseExamType and StudentResult tables exist in MySQL database...');
    const { CourseExamType, StudentResult } = models;
    await CourseExamType.sync({ alter: true });
    console.log('✓ CourseExamType table synced successfully.');
    await StudentResult.sync({ alter: true });
    console.log('✓ StudentResult table synced successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigration();
