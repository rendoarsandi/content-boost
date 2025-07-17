import { UserRepository } from '../../src/repositories/user';
import { User } from '../../src/schemas/user';

// Mock the database connection
jest.mock('../../src/connection', () => ({
  getDatabaseConnection: jest.fn().mockReturnValue({
    getClient: jest.fn().mockResolvedValue({
      query: jest.fn(),
      release: jest.fn(),
    }),
    transaction: jest.fn(),
  }),
}));

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let mockClient: any;

  beforeEach(() => {
    userRepository = new UserRepository();
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    // Mock the withClient method
    (userRepository as any).withClient = jest.fn().mockImplementation(async (callback) => {
      return callback(mockClient);
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        name: 'Test User',
        role: 'creator',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockClient.query.mockResolvedValue({ rows: [mockUser] });

      const result = await userRepository.findById(mockUser.id);

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1',
        [mockUser.id]
      );
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        createdAt: mockUser.created_at,
        updatedAt: mockUser.updated_at,
      });
    });

    it('should return null when user not found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await userRepository.findById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return user when found by email', async () => {
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        name: 'Test User',
        role: 'creator',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockClient.query.mockResolvedValue({ rows: [mockUser] });

      const result = await userRepository.findByEmail(mockUser.email);

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1',
        [mockUser.email]
      );
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        createdAt: mockUser.created_at,
        updatedAt: mockUser.updated_at,
      });
    });
  });

  describe('create', () => {
    it('should create and return new user', async () => {
      const userData = {
        email: 'new@example.com',
        name: 'New User',
        role: 'promoter' as const,
      };

      const mockCreatedUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ...userData,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockClient.query.mockResolvedValue({ rows: [mockCreatedUser] });

      const result = await userRepository.create(userData);

      expect(mockClient.query).toHaveBeenCalledWith(
        'INSERT INTO users (email, name, role) VALUES ($1, $2, $3) RETURNING *',
        [userData.email, userData.name, userData.role]
      );
      expect(result.email).toBe(userData.email);
      expect(result.name).toBe(userData.name);
      expect(result.role).toBe(userData.role);
    });
  });

  describe('update', () => {
    it('should update user and return updated data', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = { name: 'Updated Name' };

      const mockUpdatedUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Updated Name',
        role: 'creator',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockClient.query.mockResolvedValue({ rows: [mockUpdatedUser] });

      const result = await userRepository.update(userId, updateData);

      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [updateData.name, userId]
      );
      expect(result?.name).toBe(updateData.name);
    });

    it('should return null when user not found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await userRepository.update('nonexistent-id', { name: 'New Name' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should return true when user deleted successfully', async () => {
      mockClient.query.mockResolvedValue({ rowCount: 1 });

      const result = await userRepository.delete('123e4567-e89b-12d3-a456-426614174000');

      expect(result).toBe(true);
    });

    it('should return false when user not found', async () => {
      mockClient.query.mockResolvedValue({ rowCount: 0 });

      const result = await userRepository.delete('nonexistent-id');

      expect(result).toBe(false);
    });
  });

  describe('findByRole', () => {
    it('should return users with specified role', async () => {
      const mockUsers = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'creator1@example.com',
          name: 'Creator 1',
          role: 'creator',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          email: 'creator2@example.com',
          name: 'Creator 2',
          role: 'creator',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockClient.query.mockResolvedValue({ rows: mockUsers });

      const result = await userRepository.findByRole('creator');

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE role = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        ['creator', 50, 0]
      );
      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('creator');
      expect(result[1].role).toBe('creator');
    });
  });
});