// models/acadamic/studentResult.js
export default (sequelize, DataTypes) => {
  const StudentResult = sequelize.define('StudentResult', {
    resultId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    examTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    regno: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    marks: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true // Nullable for unentered/pending marks
    },
    createdBy: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    updatedBy: {
      type: DataTypes.STRING(150),
      allowNull: true
    }
  }, {
    tableName: 'StudentResult',
    timestamps: true,
    createdAt: 'createdDate',
    updatedAt: 'updatedDate',
    indexes: [
      {
        unique: true,
        fields: ['examTypeId', 'regno'],
        name: 'uq_exam_type_student_regno'
      }
    ]
  });

  StudentResult.associate = (models) => {
    StudentResult.belongsTo(models.CourseExamType, { foreignKey: 'examTypeId' });
    StudentResult.belongsTo(models.StudentDetails, { foreignKey: 'regno', targetKey: 'registerNumber' });
  };

  return StudentResult;
};
