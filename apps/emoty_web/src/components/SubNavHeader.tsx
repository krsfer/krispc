'use client';

import React from 'react';

export default function SubNavHeader() {
    return (
        <div className="bg-white border-b border-gray-200">
            <div className="container-fluid px-4">
                <div className="d-flex align-items-center py-2" style={{ height: '56px' }}>
                    <a
                        href="https://hub.krispc.fr"
                        className="text-secondary text-decoration-none me-3"
                        style={{ fontSize: '0.875rem' }}
                    >
                        ↩ Hub
                    </a>
                    <span className="text-muted me-3">|</span>
                    <span className="fw-bold text-secondary">Emoty</span>
                </div>
            </div>
        </div>
    );
}
