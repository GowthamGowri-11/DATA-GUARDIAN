import Image from 'next/image';
import Link from 'next/link';

const services = [
    {
        title: 'Fast and Free Response',
        description: 'Fast, free, and convenient data protector.',
        image: 'https://img.freepik.com/free-vector/gradient-vpn-illustration_23-2149247170.jpg?semt=ais_hybrid&w=740&q=80',
    },
    {
        title: '100% Data Guarantee',
        description: 'This is probably the most popular guarantee in the world.',
        image: 'https://img.freepik.com/free-vector/data-protection-concept_1284-10819.jpg',
    },
    {
        title: 'Online Support 24/7',
        description: 'Our online support will provide you with many services.',
        image: 'https://www.citypng.com/public/uploads/preview/hd-24-hours-service-gold-logo-icon-sign-png-704081694706034f4odpztldj.png',
    },
];

const features = [
    { title: 'Data Encryption', desc: 'Protecting your data both in transit and at rest using advanced encryption standards.' },
    { title: 'Secure Storage', desc: 'Cloud or on-premise storage options with strong access controls.' },
    { title: 'Privacy Compliance', desc: 'GDPR, CCPA, and local data protection regulation support.' },
    { title: 'User Control', desc: 'Easy tools for data access, correction, and deletion.' },
    { title: 'Threat Detection', desc: 'Real-time monitoring for unauthorized access or breaches.' },
    { title: 'Backup & Recovery', desc: 'Regular backups with fast data recovery options.' },
];

export default function ServicesPage() {
    return (
        <section className="services-section">
            <div className="container text-center">
                {/* Header */}
                <h1 className="services-head">Our Services</h1>

                {/* Features List */}
                <div className="services-para" style={{ maxWidth: '800px', margin: '0 auto 40px' }}>
                    {features.map((feature, index) => (
                        <p key={index} style={{ marginBottom: '8px' }}>
                            <strong>{feature.title}</strong> – {feature.desc}
                        </p>
                    ))}
                </div>

                {/* Service Cards */}
                <div className="row row-cols-3" style={{ marginBottom: '40px' }}>
                    {services.map((service, index) => (
                        <div key={index} className="service-card">
                            <Image
                                src={service.image}
                                alt={service.title}
                                width={400}
                                height={200}
                                className="service-card-img"
                                unoptimized
                            />
                            <h5 className="service-card-title">{service.title}</h5>
                            <p className="service-card-text">{service.description}</p>
                        </div>
                    ))}
                </div>

                {/* Navigation Buttons */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
                    <Link href="/" className="btn btn-secondary">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8" />
                        </svg>
                        Back to Home
                    </Link>
                    <Link href="/signup" className="btn btn-success">
                        Get Started
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path fillRule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8" />
                        </svg>
                    </Link>
                </div>
            </div>
        </section>
    );
}
