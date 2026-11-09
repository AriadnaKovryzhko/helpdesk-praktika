import { PrismaService } from '../prisma/prisma.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('сообщает о рабочем состоянии, когда база доступна', async () => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([1]) };
    const result = await new HealthController(prisma as unknown as PrismaService).check();
    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(result.status).toBe('ok');
  });

  it('передаёт ошибку, когда база недоступна', async () => {
    const prisma = { $queryRaw: jest.fn().mockRejectedValue(new Error('нет соединения')) };
    await expect(
      new HealthController(prisma as unknown as PrismaService).check(),
    ).rejects.toThrow();
  });
});
