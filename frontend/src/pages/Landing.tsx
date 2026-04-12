import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Landing.css';
import Navbar from '../components/NavBar';

const fontFamily = `'Inter', 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif`;

const features = [
	{
		title: 'Seamless Calendar Integration',
		description:
			'Automatically syncs appointments with Google Calendar so your schedule always stays up to date.',
		icon: '📅',
	},
	{
		title: 'Voice Agent Automation',
		description:
			'AI voice agents can answer calls and schedule appointments automatically.',
		icon: '🎙️',
	},
	{
		title: 'Adapts to Your Business Lifecycle',
		description:
			'Learns scheduling patterns and adapts to busy hours, cancellations, and seasonal demand.',
		icon: '📈',
	},
];



const HeroButton: React.FC<{ to: string; children: React.ReactNode }> = ({
	to,
	children,
}) => {
	const [hover, setHover] = useState(false);
	return (
		<Link
			to={to}
			style={{
				padding: '14px 36px',
				background: hover ? '#1d4ed8' : '#2563eb',
				color: '#fff',
				borderRadius: 10,
				textDecoration: 'none',
				fontWeight: 700,
				fontFamily,
				fontSize: 18,
				transition: 'background 0.2s, box-shadow 0.2s',
				boxShadow: hover
					? '0 4px 20px rgba(37,99,235,0.22)'
					: '0 2px 8px rgba(37,99,235,0.10)',
				display: 'inline-block',
			}}
			onMouseEnter={() => setHover(true)}
			onMouseLeave={() => setHover(false)}
		>
			{children}
		</Link>
	);
};


const Hero: React.FC = () => (
	<section className="landing-hero">
		<h1 className="landing-hero-title">
			Agents for your{' '}
			<span className="landing-hero-gradient">everyday voice</span>{' '}
			operations
		</h1>
		<p className="landing-hero-desc">
			Calendio puts your calls on autopilot. Let our agents handle
			bookings, appointments, and calendar syncing, so you never miss a client
			and continue doing the work you love.
		</p>
		<div className="landing-hero-actions">
			<HeroButton to="/auth">Try Now →</HeroButton>
			<a
				href="#features"
				style={{
					padding: '14px 36px',
					background: 'transparent',
					color: '#2563eb',
					borderRadius: 10,
					textDecoration: 'none',
					fontWeight: 600,
					fontFamily,
					fontSize: 18,
					border: '1.5px solid #2563eb',
					display: 'inline-block',
				}}
			>
				See How It Works
			</a>
		</div>
	</section>
);

const FeatureCard: React.FC<{
	icon: string;
	title: string;
	description: string;
}> = ({ icon, title, description }) => (
	<div
		style={{
			background: '#fff',
			border: '1px solid #e8edf3',
			borderRadius: 16,
			padding: '36px 28px',
			flex: '1 1 240px',
			maxWidth: 320,
			boxShadow: '0 2px 16px rgba(30,41,59,0.06)',
			fontFamily,
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'flex-start',
		}}
	>
		<div style={{ fontSize: 36, marginBottom: 16 }}>{icon}</div>
		<h3
			style={{
				fontSize: 18,
				fontWeight: 700,
				color: '#1e293b',
				marginBottom: 10,
			}}
		>
			{title}
		</h3>
		<p
			style={{
				fontSize: 15,
				color: '#64748b',
				lineHeight: 1.7,
				margin: 0,
			}}
		>
			{description}
		</p>
	</div>
);

const Features: React.FC = () => {
	const ref = useRef<HTMLElement>(null);
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) setVisible(true);
			},
			{ threshold: 0.15 }
		);
		if (ref.current) observer.observe(ref.current);
		return () => observer.disconnect();
	}, []);

	return (
		<section
			ref={ref}
			id="features"
			style={{
				padding: '72px 48px',
				background: '#f8fafc',
				fontFamily,
				opacity: visible ? 1 : 0,
				transform: visible ? 'translateY(0)' : 'translateY(40px)',
				transition: 'opacity 0.7s ease, transform 0.7s ease',
			}}
		>
			<h2
				style={{
					textAlign: 'center',
					fontSize: 28,
					fontWeight: 700,
					color: '#1e293b',
					marginBottom: 48,
				}}
			>
				Everything You Need to Automate Scheduling
			</h2>
			<div
				style={{
					display: 'flex',
					flexWrap: 'wrap',
					gap: 28,
					justifyContent: 'center',
				}}
			>
				{features.map((f) => (
					<FeatureCard
						key={f.title}
						icon={f.icon}
						title={f.title}
						description={f.description}
					/>
				))}
			</div>
		</section>
	);
};

const Landing: React.FC = () => (
	<div style={{ fontFamily, background: '#fff', minHeight: '100vh' }}>
		<Navbar />
		<Hero />
		<Features />
	</div>
);

export default Landing;
