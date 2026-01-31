'use client';

import { useState } from 'react';

interface StarRatingProps {
    avgRating?: number;
    totalRatings?: number;
    onSubmit?: (rating: number, comment: string) => Promise<void>;
}

export default function StarRating({ avgRating = 0, totalRatings = 0, onSubmit }: StarRatingProps) {
    const [selectedRating, setSelectedRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<'success' | 'error'>('success');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentAvg, setCurrentAvg] = useState(avgRating);
    const [currentTotal, setCurrentTotal] = useState(totalRatings);

    const handleSubmit = async () => {
        if (selectedRating === 0) {
            setMessage('Please select a rating first!');
            setMessageType('error');
            return;
        }

        if (!onSubmit) {
            // Demo mode - just show success
            setMessage('Thank you for your rating!');
            setMessageType('success');
            const newTotal = currentTotal + 1;
            const newAvg = ((currentAvg * currentTotal) + selectedRating) / newTotal;
            setCurrentAvg(Math.round(newAvg * 10) / 10);
            setCurrentTotal(newTotal);
            setSelectedRating(0);
            setComment('');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit(selectedRating, comment);
            setMessage('Thank you for your rating!');
            setMessageType('success');
            setSelectedRating(0);
            setComment('');
        } catch {
            setMessage('Failed to submit rating. Please try again.');
            setMessageType('error');
        } finally {
            setIsSubmitting(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const displayRating = hoverRating || selectedRating;

    const renderDisplayStars = () => {
        const stars = [];
        const fullStars = Math.floor(currentAvg);
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <span key={i} style={{ color: '#ffc107', fontSize: '32px' }}>
                    {i <= fullStars ? '★' : '☆'}
                </span>
            );
        }
        return stars;
    };

    return (
        <div className="card-container" style={{ marginTop: '20px' }}>
            <h3 style={{ fontFamily: "'Lobster', cursive", marginBottom: '15px' }}>
                Rate Our Website
            </h3>

            {/* Current Rating Display */}
            <div style={{ marginBottom: '15px' }}>
                {currentTotal > 0 ? (
                    <>
                        <div style={{ marginBottom: '5px' }}>{renderDisplayStars()}</div>
                        <p style={{ fontSize: '18px', margin: 0 }}>
                            <strong>{currentAvg.toFixed(1)}</strong> / 5.0{' '}
                            <span style={{ fontSize: '14px', color: '#666' }}>
                                ({currentTotal} rating{currentTotal !== 1 ? 's' : ''})
                            </span>
                        </p>
                    </>
                ) : (
                    <p style={{ fontSize: '18px' }}>Be the first to rate us!</p>
                )}
            </div>

            {/* Star Selection */}
            <div style={{ marginBottom: '15px' }}>
                <p style={{ fontSize: '16px', marginBottom: '10px' }}>Your Rating:</p>
                <div className="star-rating">
                    {[1, 2, 3, 4, 5].map((rating) => (
                        <span
                            key={rating}
                            className={`star ${displayRating >= rating ? 'active' : ''}`}
                            onMouseEnter={() => setHoverRating(rating)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setSelectedRating(rating)}
                            style={{
                                color: displayRating >= rating ? '#ffc107' : '#ddd',
                            }}
                        >
                            {displayRating >= rating ? '★' : '☆'}
                        </span>
                    ))}
                </div>
            </div>

            {/* Comment Input */}
            <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Optional: Leave a comment..."
                rows={2}
                style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    marginBottom: '10px',
                    fontSize: '14px',
                    resize: 'vertical',
                }}
            />

            {/* Submit Button */}
            <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="btn btn-warning"
                style={{ width: '100%' }}
            >
                {isSubmitting ? 'Submitting...' : 'Submit Rating'}
            </button>

            {/* Message */}
            {message && (
                <div
                    style={{
                        marginTop: '10px',
                        fontSize: '14px',
                        color: messageType === 'success' ? '#28a745' : '#dc3545',
                    }}
                >
                    {message}
                </div>
            )}
        </div>
    );
}
