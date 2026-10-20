import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/mysql.js';

const Holiday = sequelize.define('Holiday', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(150), allowNull: false },
  holiday_date: { type: DataTypes.DATEONLY, allowNull: false },
  academic_year: { type: DataTypes.STRING(9), allowNull: false },
  holiday_type: { type: DataTypes.ENUM('government', 'sunday', 'third_saturday'), allowNull: false, defaultValue: 'government' },
  created_by: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'holidays',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [{ unique: true, fields: ['holiday_date'] }],
});

export default Holiday;
