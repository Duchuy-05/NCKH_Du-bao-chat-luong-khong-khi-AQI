import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  BeforeCreate,
  BeforeUpdate,
  Unique,
  AllowNull,
  Default,
} from 'sequelize-typescript';
import bcrypt from 'bcryptjs';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Table({
  tableName: 'users',
  timestamps: true,
})
export class User extends Model {
  // Primary key: auto-increment integer
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  declare id: number;

  // Full name of the user
  @AllowNull(false)
  @Column({
    type: DataType.STRING(100),
    field: 'full_name',
  })
  declare fullName: string;

  // Email – must be unique across the table
  @Unique
  @AllowNull(false)
  @Column({
    type: DataType.STRING(255),
  })
  declare email: string;

  // Hashed password (never stored in plain text)
  @AllowNull(false)
  @Column({
    type: DataType.STRING(255),
    field: 'password_hash',
  })
  declare passwordHash: string;

  // Role: 'user' (default) or 'admin'
  @Default(UserRole.USER)
  @Column({
    type: DataType.ENUM(...Object.values(UserRole)),
  })
  declare role: UserRole;

  // Whether the account has been activated
  @Default(true)
  @Column({
    type: DataType.BOOLEAN,
    field: 'is_active',
  })
  declare isActive: boolean;

  // Timestamp of last login
  @Column({
    type: DataType.DATE,
    field: 'last_login_at',
    allowNull: true,
  })
  declare lastLoginAt: Date | null;

  // Sequelize-managed timestamps
  @CreatedAt
  @Column({ field: 'created_at' })
  declare createdAt: Date;

  @UpdatedAt
  @Column({ field: 'updated_at' })
  declare updatedAt: Date;

  // ─── Hooks ───────────────────────────────────────────────────────────────

  /** Hash password before creating a new record */
  @BeforeCreate
  static async hashPasswordOnCreate(instance: User): Promise<void> {
    if (instance.passwordHash) {
      const salt = await bcrypt.genSalt(12);
      instance.passwordHash = await bcrypt.hash(instance.passwordHash, salt);
    }
  }

  /** Hash password before updating (only when it actually changed) */
  @BeforeUpdate
  static async hashPasswordOnUpdate(instance: User): Promise<void> {
    if (instance.changed('passwordHash')) {
      const salt = await bcrypt.genSalt(12);
      instance.passwordHash = await bcrypt.hash(instance.passwordHash, salt);
    }
  }

  // ─── Instance methods ─────────────────────────────────────────────────────

  /** Compare a plain-text password with the stored hash */
  async comparePassword(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.passwordHash);
  }

  /** Return a safe representation (no password hash) */
  toSafeObject() {
    return {
      id: this.id,
      fullName: this.fullName,
      email: this.email,
      role: this.role,
      isActive: this.isActive,
      lastLoginAt: this.lastLoginAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
