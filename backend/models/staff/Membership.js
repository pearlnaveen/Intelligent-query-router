import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/mysql.js';

const Membership = sequelize.define(
  'Membership',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
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
    society_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Name of the Professional Society / Body (National or International Level)',
    },
    position_grade: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Name of the Grade / Level / Position',
    },
    contributions: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Contributions to Professional Societies during the Assessment Period (AY 2025–2026)',
    },
    membership_number: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Membership Number',
    },
    proof_document: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'PDF Upload proof path or reference',
    },
  },
  {
    tableName: 'memberships',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default Membership;
