import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/mysql.js';

const AttendedCompany = sequelize.define('AttendedCompany', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  Userid: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'Userid',
    },
    onDelete: 'CASCADE',
  },
  company_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  rounds_cleared: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('Placed', 'Not Placed', 'Ongoing', 'Pipelined'),
    allowNull: false,
    defaultValue: 'Ongoing',
  }
}, {
  timestamps: true,
  tableName: 'student_attended_companies',
  underscored: false,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default AttendedCompany;
