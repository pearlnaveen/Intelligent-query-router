import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/mysql.js';

const FundedProjectRelease = sequelize.define(
  'FundedProjectRelease',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    funded_project_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'project_proposals',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    release_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    amount_received: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    remarks: {
      type: DataTypes.STRING(500),
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    tableName: 'funded_project_releases',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default FundedProjectRelease;
