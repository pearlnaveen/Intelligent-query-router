import { DataTypes } from "sequelize";
import { sequelize } from "../../config/mysql.js";

const Marksheet = sequelize.define(
  "Marksheet",
  {
    marksheetId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    Userid: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "Userid" },
    },
    category: {
      type: DataTypes.ENUM("Semester", "Personal"),
      allowNull: false,
    },
    marksheetName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    receivedStatus: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    issueDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    certificateNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    file_path: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    file_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    verification_status: {
      type: DataTypes.ENUM("Pending", "Approved", "Rejected"),
      allowNull: true,
      defaultValue: null,
    },
    verified_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "users", key: "Userid" },
    },
    verified_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    comments: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    tableName: "marksheet_statuses",
  }
);

export default Marksheet;
