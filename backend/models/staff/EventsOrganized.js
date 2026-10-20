import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/mysql.js';

const EventsOrganized = sequelize.define('EventsOrganized', {
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
  program_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  program_title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  coordinator_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  co_coordinator_names: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  speaker_details: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  from_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  to_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  days: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  funding_type: {
    type: DataTypes.ENUM('With Fund', 'Without Fund'),
    allowNull: true,
    defaultValue: 'Without Fund',
  },
  with_funding: {
    type: DataTypes.STRING(10),
    allowNull: true,
    defaultValue: 'No',
  },
  with_self_supporting: {
    type: DataTypes.STRING(10),
    allowNull: true,
    defaultValue: 'No',
  },
  funding_agency: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  sponsored_by: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  amount_sanctioned: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  amount_received: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  participants: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  document_link: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  proof: {
    type: DataTypes.BLOB('long'),
    allowNull: true,
  },
  documentation: {
    type: DataTypes.BLOB('long'),
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    field: 'created_at',
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    field: 'updated_at',
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: true,
  tableName: 'events_organized',
});

export default EventsOrganized;
