// Add only the known missing records fields; never alter or drop existing data.
// Preview: node Scripts/repair_records_schema.js
// Apply:   node Scripts/repair_records_schema.js --apply
import { sequelize } from '../config/mysql.js';
import { repairRecordsSchema } from '../utils/repairRecordsSchema.js';

const apply = process.argv.includes('--apply');

try {
  const missing = await repairRecordsSchema({ apply });
  console.log(missing ? `${missing} schema additions ${apply ? 'applied' : 'needed; use --apply to repair'}.` : 'Records schema is up to date.');
} catch (error) {
  console.error('Schema repair failed:', error.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
