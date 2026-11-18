import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Showing } from '../../showings/entities/showing.entity';
import { BookingSeat } from './booking-seat.entity';

/** The seats of a booking are rows of `booking_seats`, not a column here. */
@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'showing_id', type: 'uuid' })
  showingId: string;

  /** Showing price multiplied by the number of seats, smallest currency unit. */
  @Column({ name: 'total_price', type: 'integer' })
  totalPrice: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  /** Required relation: a booking does not exist without its showing. */
  @ManyToOne(() => Showing, (showing) => showing.bookings, {
    nullable: false,
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'showing_id' })
  showing?: Showing;

  /**
   * A booking has many seats. They are removed together with the booking by
   * the database: see `onDelete: 'CASCADE'` on `BookingSeat.booking`.
   */
  @OneToMany(() => BookingSeat, (seat) => seat.booking)
  seats?: BookingSeat[];
}
