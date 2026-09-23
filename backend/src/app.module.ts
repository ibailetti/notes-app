import { isAbsolute, join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { Category } from './categories/category.entity';
import { NotesModule } from './notes/notes.module';
import { Note } from './notes/note.entity';
import { User } from './users/user.entity';
import { UsersModule } from './users/users.module';

/** Backend root folder (one level above `src/` or `dist/`). */
const BACKEND_ROOT = join(__dirname, '..');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(BACKEND_ROOT, '.env'),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbPath = config.get<string>('DB_PATH', 'notes.sqlite');
        return {
          type: 'better-sqlite3',
          database: isAbsolute(dbPath) ? dbPath : join(BACKEND_ROOT, dbPath),
          entities: [User, Note, Category],
          synchronize: true,
        };
      },
    }),
    UsersModule,
    AuthModule,
    CategoriesModule,
    NotesModule,
  ],
})
export class AppModule {}
