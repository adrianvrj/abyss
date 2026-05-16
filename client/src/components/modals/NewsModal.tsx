import ModalWrapper from "./ModalWrapper";
import { STATIC_CHARM_DEFINITIONS } from "@/lib/charmCatalog";

const NEW_CHARM_IDS = [21, 22, 23, 24, 25, 26, 27];

interface NewsModalProps {
    onClose: () => void;
}

export default function NewsModal({ onClose }: NewsModalProps) {
    const charms = NEW_CHARM_IDS.map((id) => STATIC_CHARM_DEFINITIONS[id]).filter(Boolean);

    return (
        <ModalWrapper onClose={onClose} title="NEWS" maxWidth={760} maxHeight="88vh">
            <div className="news-modal">
                <section className="news-hero" aria-labelledby="news-title">
                    <div className="news-release-stamp">
                        <span>Update</span>
                        <strong>Charms 21-27</strong>
                    </div>
                    <div className="news-hero-copy">
                        <span className="news-kicker">New in the Abyss</span>
                        <h3 id="news-title">Seven charms joined the pool.</h3>
                        <p>
                            Fresh build paths are live: duplicate verticals, spin-plus-luck pieces,
                            inventory scaling, and two debt-pledge charms for riskier runs.
                        </p>
                    </div>
                </section>

                <section className="news-layout" aria-label="Update details">
                    <div className="news-ledger">
                        <span className="news-section-label">Highlights</span>
                        <ul>
                            <li>
                                <strong>New range</strong>
                                <span>Charm IDs 21 through 27 can now appear.</span>
                            </li>
                            <li>
                                <strong>New triggers</strong>
                                <span>Vertical retriggers and geometry payouts open new routes.</span>
                            </li>
                            <li>
                                <strong>New debt builds</strong>
                                <span>Pledge score during the run, then cash it back on the right hit.</span>
                            </li>
                        </ul>
                    </div>

                    <div className="news-roster">
                        <div className="news-roster-header">
                            <span className="news-section-label">Charm roster</span>
                            <span className="news-count">{charms.length} additions</span>
                        </div>
                        <div className="news-charm-grid">
                            {charms.map((charm) => (
                                <article key={charm.charm_id} className="news-charm-card">
                                    <div className="news-charm-art" style={{ borderColor: charm.background_color }}>
                                        <img src={charm.image} alt={charm.name} width={76} height={76} loading="lazy" />
                                    </div>
                                    <div className="news-charm-copy">
                                        <div className="news-charm-topline">
                                            <span>#{charm.charm_id}</span>
                                            <strong>{charm.rarity}</strong>
                                        </div>
                                        <h4>{charm.name}</h4>
                                        <p>{charm.effect}</p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <div className="news-footer">
                    <span>Shown once per update.</span>
                    <button type="button" className="news-close-btn" onClick={onClose}>
                        ENTER ABYSS
                    </button>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .news-modal {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    color: #f6efe6;
                }
                .news-hero {
                    display: grid;
                    grid-template-columns: 132px minmax(0, 1fr);
                    gap: 16px;
                    align-items: stretch;
                    padding: 14px;
                    border: 1px solid rgba(255, 132, 28, 0.42);
                    border-radius: 8px;
                    background:
                        linear-gradient(90deg, rgba(255, 132, 28, 0.13), transparent 42%),
                        repeating-linear-gradient(135deg, rgba(255,255,255,0.035) 0, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 7px),
                        rgba(8, 4, 2, 0.78);
                }
                .news-release-stamp {
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    min-height: 118px;
                    padding: 12px;
                    border: 1px solid rgba(255, 132, 28, 0.44);
                    border-radius: 6px;
                    background: rgba(0, 0, 0, 0.36);
                }
                .news-release-stamp span,
                .news-section-label,
                .news-count,
                .news-footer span {
                    font-family: 'PressStart2P', monospace;
                    font-size: 7px;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    color: rgba(255, 236, 218, 0.58);
                }
                .news-release-stamp strong {
                    font-family: 'PressStart2P', monospace;
                    font-size: 12px;
                    line-height: 1.45;
                    color: #FFE08A;
                    font-weight: 400;
                }
                .news-hero-copy {
                    min-width: 0;
                    padding: 4px 2px;
                }
                .news-kicker {
                    display: block;
                    margin-bottom: 10px;
                    font-family: 'PressStart2P', monospace;
                    font-size: 8px;
                    color: #FF841C;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                }
                .news-hero h3 {
                    margin: 0;
                    font-family: 'PressStart2P', monospace;
                    font-size: 18px;
                    line-height: 1.55;
                    color: #fff4e8;
                }
                .news-hero p {
                    max-width: 560px;
                    margin: 10px 0 0;
                    font-family: var(--font-body);
                    font-size: 15px;
                    line-height: 1.5;
                    color: #d4cbbf;
                }
                .news-layout {
                    display: grid;
                    grid-template-columns: minmax(170px, 0.62fr) minmax(0, 1.38fr);
                    gap: 12px;
                }
                .news-ledger,
                .news-roster {
                    border: 1px solid rgba(255, 132, 28, 0.22);
                    border-radius: 8px;
                    background: rgba(0, 0, 0, 0.42);
                }
                .news-ledger {
                    padding: 13px;
                }
                .news-ledger ul {
                    display: flex;
                    flex-direction: column;
                    gap: 11px;
                    margin: 13px 0 0;
                    padding: 0;
                    list-style: none;
                }
                .news-ledger li {
                    padding-left: 10px;
                    border-left: 2px solid rgba(255, 132, 28, 0.48);
                }
                .news-ledger li strong {
                    display: block;
                    margin-bottom: 5px;
                    font-family: 'PressStart2P', monospace;
                    font-size: 8px;
                    line-height: 1.55;
                    color: #f6efe6;
                    font-weight: 400;
                }
                .news-ledger li span {
                    display: block;
                    font-family: var(--font-body);
                    font-size: 13px;
                    line-height: 1.35;
                    color: #cbbfb0;
                }
                .news-roster {
                    padding: 12px;
                }
                .news-roster-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                    margin-bottom: 10px;
                }
                .news-count {
                    color: #FFB15C;
                    letter-spacing: 0.04em;
                }
                .news-charm-grid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 8px;
                }
                .news-charm-card {
                    display: grid;
                    grid-template-columns: 76px minmax(0, 1fr);
                    gap: 10px;
                    align-items: center;
                    min-height: 102px;
                    padding: 9px;
                    border: 1px solid rgba(255, 132, 28, 0.16);
                    border-radius: 7px;
                    background: rgba(14, 8, 4, 0.72);
                }
                .news-charm-art {
                    width: 76px;
                    height: 76px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid;
                    border-radius: 7px;
                    background:
                        linear-gradient(180deg, rgba(255,255,255,0.055), rgba(0,0,0,0.18)),
                        rgba(255, 255, 255, 0.025);
                }
                .news-charm-art img {
                    width: 68px;
                    height: 68px;
                    object-fit: contain;
                    image-rendering: pixelated;
                }
                .news-charm-copy {
                    min-width: 0;
                }
                .news-charm-topline {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    margin-bottom: 7px;
                    font-family: 'PressStart2P', monospace;
                    font-size: 7px;
                    color: rgba(255, 236, 218, 0.56);
                    text-transform: uppercase;
                }
                .news-charm-topline strong {
                    color: #FFB15C;
                    font-weight: 400;
                }
                .news-charm-card h4 {
                    margin: 0;
                    font-family: 'PressStart2P', monospace;
                    font-size: 9px;
                    line-height: 1.45;
                    color: #f6efe6;
                }
                .news-charm-card p {
                    margin: 6px 0 0;
                    font-family: var(--font-body);
                    font-size: 12px;
                    line-height: 1.35;
                    color: #cbbfb0;
                }
                .news-footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 14px;
                    padding-top: 2px;
                }
                .news-close-btn {
                    min-height: 44px;
                    padding: 0 18px;
                    border: 1px solid rgba(255, 132, 28, 0.72);
                    border-radius: 8px;
                    background: #1c0f07;
                    color: #f6efe6;
                    font-family: 'PressStart2P', monospace;
                    font-size: 10px;
                    cursor: pointer;
                }
                .news-close-btn:hover,
                .news-close-btn:focus-visible {
                    color: #FF841C;
                    background: #241106;
                }
                @media (max-width: 760px) {
                    .news-hero,
                    .news-layout {
                        grid-template-columns: 1fr;
                    }
                    .news-release-stamp {
                        min-height: 0;
                        flex-direction: row;
                        align-items: center;
                        gap: 14px;
                    }
                    .news-hero h3 {
                        font-size: 14px;
                    }
                    .news-hero p {
                        font-size: 13px;
                    }
                    .news-charm-grid {
                        grid-template-columns: 1fr;
                    }
                    .news-footer {
                        align-items: stretch;
                        flex-direction: column;
                    }
                    .news-close-btn {
                        width: 100%;
                    }
                }
                @media (max-width: 420px) {
                    .news-charm-card {
                        grid-template-columns: 62px minmax(0, 1fr);
                    }
                    .news-charm-art {
                        width: 62px;
                        height: 62px;
                    }
                    .news-charm-art img {
                        width: 56px;
                        height: 56px;
                    }
                }
            ` }} />
        </ModalWrapper>
    );
}
