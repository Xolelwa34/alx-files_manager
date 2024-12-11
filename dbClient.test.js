import dbClient from '../utils/db';

describe('dbClient', () => {
  it('should return true when the database connection is alive', async () => {
    const isAlive = await dbClient.isAlive();
    expect(isAlive).toBe(true);
  });

  it('should return the correct number of users', async () => {
    const nbUsers = await dbClient.nbUsers();
    expect(nbUsers).toBeGreaterThanOrEqual(0);
  });

  it('should return the correct number of files', async () => {
    const nbFiles = await dbClient.nbFiles();
    expect(nbFiles).toBeGreaterThanOrEqual(0);
  });
});

