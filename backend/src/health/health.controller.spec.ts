import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('сообщает о рабочем состоянии', () => {
    const result = new HealthController().check();
    expect(result.status).toBe('ok');
    expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
});
