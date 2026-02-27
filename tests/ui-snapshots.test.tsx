import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LoginGate } from '../src/components/LoginGate';
import { Alert, Badge, Button, Card, InputField, PageShell } from '../src/components/ui';

describe('UI snapshots', () => {
  it('renders design-system primitives consistently', () => {
    const html = renderToStaticMarkup(
      <PageShell>
        <Card elevated>
          <Badge tone="info">Status</Badge>
          <InputField id="email" label="Email" value="agent@example.com" readOnly />
          <Alert tone="warning">Check required fields</Alert>
          <Button type="button">Save</Button>
        </Card>
      </PageShell>,
    );
    expect(html).toMatchSnapshot();
  });

  it('renders login gate with structured auth layout', () => {
    const html = renderToStaticMarkup(<LoginGate onSuccess={() => undefined} darkMode={false} />);
    expect(html).toMatchSnapshot();
  });
});
