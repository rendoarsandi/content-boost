import { supabase } from '@repo/config/supabase';

// Define the User type, mirroring the expected database schema.
// In a real project, this could be auto-generated from OpenAPI specs.
export interface User {
  id: string;
  email: string;
  name?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const userRepository = {
  async findById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      console.error('Error fetching user by ID:', error);
      return null;
    }
    return data;
  },

  async findByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    if (error) {
      console.error('Error fetching user by email:', error);
      return null;
    }
    return data;
  },

  async create(
    userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();
    if (error) {
      console.error('Error creating user:', error);
      return null;
    }
    return data;
  },

  async update(
    id: string,
    userData: Partial<Omit<User, 'id'>>
  ): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .update(userData)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Error updating user:', error);
      return null;
    }
    return data;
  },

  async delete(id: string): Promise<{ error: any | null }> {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) {
      console.error('Error deleting user:', error);
    }
    return { error };
  },
};
