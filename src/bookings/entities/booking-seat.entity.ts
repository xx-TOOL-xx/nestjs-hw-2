import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Showing } from '../../showings/entities/showing.entity';
import { Booking } from './booking.entity';

/**
 * One seat taken by one booking on one showing.
 *
 * The unique index is the rule of the whole service: a seat of a showing
 * cannot be sold twice. `showing_id` repeats what the booking already knows
 * on purpose, because an index covers columns of a single table only.
 */
@Entity('booking_seats')
@Index('UQ_booking_seats_showing_row_seat', ['showingId', 'row', 'seat'], {
  unique: true,
})
export class BookingSeat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId: string;

  @Column({ name: 'showing_id', type: 'uuid' })
  showingId: string;

  @Column({ type: 'integer' })
  row: number;

  @Column({ type: 'integer' })
  seat: number;

  /** Required relation. Deleting the booking deletes its seats in the database. */
  @ManyToOne(() => Booking, (booking) => booking.seats, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'booking_id' })
  booking?: Booking;

  /** Required relation to the showing the seat is taken on. */
  @ManyToOne(() => Showing, { nullable: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'showing_id' })
  showing?: Showing;
}
