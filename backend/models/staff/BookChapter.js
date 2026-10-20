import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/mysql.js';

const BookChapter = sequelize.define('BookChapter', {
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

  publication_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'journal',
  },

  publication_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },

  publication_title: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },

  authors: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: 'Array of author names',
  },

  published_month: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },

  published_year: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },

  index_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'Scopus',
  },

  doi: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },

  impact_factor: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },

  volume_no: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },

  page_no: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },

  issue_no: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },

  citations: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },

  publisher: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },

  publication_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },

  publication_link: {
    type: DataTypes.STRING(2048),
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
  tableName: 'book_chapters',
});

export default BookChapter;
