'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

const images = [
    {
        src: 'https://static.vecteezy.com/system/resources/thumbnails/005/419/403/small_2x/data-protection-personal-data-security-concept-on-virtual-screen-protected-folder-icon-cyber-security-internet-privacy-and-safety-wireframe-hand-touching-digital-interface-illustration-vector.jpg',
        alt: 'Data Protection Concept',
    },
    {
        src: 'https://thumbs.dreamstime.com/b/mobile-phone-personal-data-cyber-security-threat-concept-cellphone-fraud-smartphone-hacked-illegal-spyware-ransomware-158418683.jpg',
        alt: 'Mobile Security',
    },
    {
        src: 'https://www.shutterstock.com/image-vector/protector-holding-shield-using-reflect-600nw-2282449807.jpg',
        alt: 'Security Shield',
    },
];

export default function Carousel() {
    const [currentIndex, setCurrentIndex] = useState(0);

    const nextSlide = useCallback(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
    }, []);

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    const goToSlide = (index: number) => {
        setCurrentIndex(index);
    };

    // Auto-advance carousel
    useEffect(() => {
        const timer = setInterval(nextSlide, 5000);
        return () => clearInterval(timer);
    }, [nextSlide]);

    return (
        <div className="carousel-container">
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '12px' }}>
                <div
                    style={{
                        display: 'flex',
                        transition: 'transform 0.5s ease-in-out',
                        transform: `translateX(-${currentIndex * 100}%)`,
                    }}
                >
                    {images.map((image, index) => (
                        <div
                            key={index}
                            style={{
                                minWidth: '100%',
                                position: 'relative',
                                height: '400px',
                            }}
                        >
                            <Image
                                src={image.src}
                                alt={image.alt}
                                fill
                                style={{ objectFit: 'cover' }}
                                className="carousel-image"
                                unoptimized
                            />
                        </div>
                    ))}
                </div>

                {/* Navigation Arrows */}
                <button
                    onClick={prevSlide}
                    className="carousel-arrow prev"
                    aria-label="Previous slide"
                >
                    <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                        <path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8" />
                    </svg>
                </button>
                <button
                    onClick={nextSlide}
                    className="carousel-arrow next"
                    aria-label="Next slide"
                >
                    <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                        <path fillRule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8" />
                    </svg>
                </button>
            </div>

            {/* Dots Indicator */}
            <div className="carousel-controls">
                {images.map((_, index) => (
                    <button
                        key={index}
                        className={`carousel-dot ${index === currentIndex ? 'active' : ''}`}
                        onClick={() => goToSlide(index)}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}
