import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { buildDataSourceOptions } from './database/database.config';
import { NotesModule } from './notes/notes.module';
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
      useFactory: (config: ConfigService) =>
        buildDataSourceOptions((key) => config.get<string>(key)),
    }),
    UsersModule,
    AuthModule,
    CategoriesModule,
    NotesModule,
  ],
})
export class AppModule {}
