import { describe, it, expect } from 'vitest';
import Home from '../Home';

describe('Home Component', () => {
	it('renders correctly', () => {
		const { container } = render(<Home />);
		expect(container).toBeInTheDocument();
	});

	it('displays the correct title', () => {
		const { getByText } = render(<Home />);
		expect(getByText('Welcome to Home')).toBeInTheDocument();
	});
});