import { sequelize } from '../config/mysql.js';
import Marksheet from '../models/student/marksheet.js';
import StudentEducation from '../models/student/StudentEducation.js';
import CompetencyCoding from '../models/student/CompetencyCoding.js';
import EventsOrganized from '../models/staff/EventsOrganized.js';
import StudentStatus from '../models/student/StudentStatus.js';
import SkillRack from '../models/student/SkillRack.js';
import Holiday from '../models/admin/Holiday.js';
import StudentDetails from '../models/student/StudentDetails.js';

// This is intentionally additive: it creates only known missing fields/tables.
// It never modifies or deletes existing student data.
const changes = [
  [Marksheet, ['file_path', 'file_name', 'verification_status', 'verified_by', 'verified_at', 'comments']],
  [StudentEducation, ['degree_year_of_passing']],
  [CompetencyCoding, ['career_objectives', 'career_objective_details', 'specialization_chosen', 'expected_ctc', 'communication_skills']],
  [EventsOrganized, ['with_funding', 'with_self_supporting', 'document_link']],
  [SkillRack, ['name', 'last_week', 'code_tutor', 'dc', 'dt', 'aptitude_score', 'points', 'gold_medals', 'silver_medals', 'level_details']],
  [StudentDetails, ['skillrackProfile', 'githubProfile', 'leetcodeProfile', 'portfolioProfile']],
];

export async function repairRecordsSchema({ apply = true } = {}) {
  const query = sequelize.getQueryInterface();
  let missing = 0;

  for (const [model, fields] of changes) {
    const table = model.getTableName();
    const columns = await query.describeTable(table);
    for (const field of fields) {
      if (columns[field]) continue;
      missing++;
      console.log(`${apply ? 'Adding' : 'Missing'} ${table}.${field}`);
      if (apply) await query.addColumn(table, field, model.rawAttributes[field]);
    }
  }

  const tables = await query.showAllTables();
  if (!tables.includes(Holiday.getTableName())) {
    missing++;
    console.log(`${apply ? 'Creating' : 'Missing'} ${Holiday.getTableName()}`);
    if (apply) await Holiday.sync();
  }
  if (!tables.includes(StudentStatus.getTableName())) {
    missing++;
    console.log(`${apply ? 'Creating' : 'Missing'} ${StudentStatus.getTableName()}`);
    if (apply) await StudentStatus.sync();
  }

  return missing;
}
