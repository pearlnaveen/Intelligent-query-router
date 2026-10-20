import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/mysql.js';

const ConsultancyRelease = sequelize.define(
    'ConsultancyRelease',
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        consultancy_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'consultancy_proposals',
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
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        tableName: 'consultancy_releases',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);

export default ConsultancyRelease;
