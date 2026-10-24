import { Room, RoomSettings } from '../models/Room.js';
import { Player } from '../models/Player.js';
import { GameCallbacks } from '../models/Game.js';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();

  /**
   * Generates a clean 6-character room code without ambiguous characters.
   */
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));
    return code;
  }

  /**
   * Creates a new room with the specified host and settings.
   */
  public createRoom(
    hostPlayer: Player,
    settings?: Partial<RoomSettings>,
    callbacks?: Partial<GameCallbacks>
  ): Room {
    const code = this.generateRoomCode();
    const room = new Room(code, hostPlayer, settings, callbacks);
    this.rooms.set(code, room);
    return room;
  }

  /**
   * Retrieves a room by code (case-insensitive).
   */
  public getRoom(code: string): Room | undefined {
    if (!code) return undefined;
    return this.rooms.get(code.toUpperCase().trim());
  }

  /**
   * Removes a room and cleans up resources.
   */
  public deleteRoom(code: string): void {
    const upper = code.toUpperCase().trim();
    const room = this.rooms.get(upper);
    if (room) {
      room.destroy();
      this.rooms.delete(upper);
    }
  }

  /**
   * Returns all public rooms with available slots (for optional public room listing).
   */
  public getPublicRooms(): Array<{ id: string; playerCount: number; maxPlayers: number; phase: string }> {
    const list: Array<{ id: string; playerCount: number; maxPlayers: number; phase: string }> = [];
    this.rooms.forEach(room => {
      if (!room.settings.isPrivate && room.players.size < room.settings.maxPlayers) {
        list.push({
          id: room.id,
          playerCount: room.players.size,
          maxPlayers: room.settings.maxPlayers,
          phase: room.game.phase,
        });
      }
    });
    return list;
  }

  public getRoomCount(): number {
    return this.rooms.size;
  }
}

export const roomManager = new RoomManager();
