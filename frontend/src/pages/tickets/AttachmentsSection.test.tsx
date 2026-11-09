import { validateAttachment } from './AttachmentsSection';

const file = (name: string, size = 10) => {
  const item = new File(['x'], name);
  Object.defineProperty(item, 'size', { value: size });
  return item;
};

describe('validateAttachment', () => {
  it('принимает разрешённые форматы', () => {
    for (const name of ['a.jpg', 'a.JPEG', 'a.png', 'a.pdf', 'отчёт.docx']) {
      expect(validateAttachment(file(name))).toBeNull();
    }
  });

  it('отклоняет другие расширения', () => {
    expect(validateAttachment(file('a.exe'))).toContain('Разрешены только');
  });

  it('отклоняет файл больше 5 МБ', () => {
    expect(validateAttachment(file('a.png', 5 * 1024 * 1024 + 1))).toContain('5 МБ');
  });
});
