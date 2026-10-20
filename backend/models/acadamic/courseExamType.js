// models/acadamic/courseExamType.js
export default (sequelize, DataTypes) => {
  const CourseExamType = sequelize.define('CourseExamType', {
    examTypeId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    courseId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    batchId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    examTypeName: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    maxMarks: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
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
    tableName: 'CourseExamType',
    timestamps: true,
    createdAt: 'createdDate',
    updatedAt: 'updatedDate',
    indexes: [
      {
        unique: true,
        fields: ['courseId', 'examTypeName'],
        name: 'uq_course_exam_type_name'
      }
    ]
  });

  CourseExamType.associate = (models) => {
    CourseExamType.belongsTo(models.Course, { foreignKey: 'courseId' });
    CourseExamType.belongsTo(models.Batch, { foreignKey: 'batchId' });
    CourseExamType.hasMany(models.StudentResult, { foreignKey: 'examTypeId', onDelete: 'CASCADE' });
  };

  return CourseExamType;
};
