import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CategoriesModule } from '../categories/categories.module';
import { Note } from './note.entity';
import { NotesController } from './notes.controller';
import { NotesRepository } from './notes.repository';
import { NotesService } from './notes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Note]), AuthModule, CategoriesModule],
  controllers: [NotesController],
  providers: [NotesRepository, NotesService],
  exports: [NotesService],
})
export class NotesModule {}
