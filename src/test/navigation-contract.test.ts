import { deepLinkPlaceholders, modalRoutes, primaryTabs, quickLogAction } from '@/contracts/navigation';

describe('navigation contract', () => {
  it('keeps Today, Health, and More as the only primary tabs', () => {
    expect(primaryTabs.map((tab) => tab.id)).toEqual(['today', 'health', 'more']);
    expect(primaryTabs.map((tab) => tab.href)).toEqual(['/today', '/health', '/more']);
    expect(new Set(primaryTabs.map((tab) => tab.id)).size).toBe(primaryTabs.length);
  });

  it('keeps Quick Log as a modal action instead of a primary tab', () => {
    expect(primaryTabs).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: quickLogAction.id,
        }),
      ]),
    );
    expect(primaryTabs.map((tab) => tab.href)).not.toContain(quickLogAction.href);
    expect(modalRoutes).toContain(quickLogAction.href);
  });

  it('keeps invite and share token placeholders as route patterns only', () => {
    expect(deepLinkPlaceholders).toEqual(['/invite/[token]', '/share/[token]']);
    expect(deepLinkPlaceholders.every((route) => route.includes('[token]'))).toBe(true);
  });
});
