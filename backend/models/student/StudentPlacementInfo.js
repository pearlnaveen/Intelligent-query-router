import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/mysql.js';

const StudentPlacementInfo = sequelize.define('StudentPlacementInfo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  Userid: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: 'users',
      key: 'Userid',
    },
    onDelete: 'CASCADE',
  },
  career_objective: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  specialization: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  dream_company: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  expected_ctc: {
    type: DataTypes.STRING(100),
    allowNull: true,
  }
}, {
  timestamps: true,
  tableName: 'student_placement_infos',
  underscored: false,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default StudentPlacementInfo;
