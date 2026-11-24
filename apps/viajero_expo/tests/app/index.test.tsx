import { render, screen } from '@testing-library/react-native';

import Inicio from '@/app/index';

// Humo: jest-expo + Testing Library + alias `@/` resuelven juntos.
describe('Inicio (placeholder)', () => {
  it('muestra la marca Diverso', async () => {
    await render(<Inicio />);

    expect(screen.getByRole('header', { name: 'Diverso' })).toBeOnTheScreen();
  });
});
