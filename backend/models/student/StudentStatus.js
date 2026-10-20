import { DataTypes } from "sequelize";
import { sequelize } from "../../config/mysql.js";

const StudentStatus = sequelize.define(
  "StudentStatus",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "student_details", key: "studentId" },
      onDelete: "CASCADE",
    },

    status: {
      type: DataTypes.ENUM(
        "Active",
        "Inactive",
        "Break of Study",
        "Suspended / Dismissed",
        "Discontinued"
      ),
      allowNull: false,
      defaultValue: "Active",
    },

    effectiveDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    // Break of Study fields
    fromDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },

    toDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },

    reason: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    supportingDocument: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },

    // Return from Break fields
    returnDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },

    returnDocument: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },

    returnSupportingDoc: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },

    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "users", key: "userId" },
    },
  },
  {
    timestamps: true,
    tableName: "student_statuses",
  }
);

export default StudentStatus;

