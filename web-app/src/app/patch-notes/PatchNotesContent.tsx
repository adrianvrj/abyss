import Image from "next/image";
import { getItemImageUrl } from "@/lib/itemImageUrl";

function StatusBadge({ kind }: { kind: "active" | "retired" | null }) {
  if (!kind) return null;
  if (kind === "active") {
    return <span className="badge badge-active">ACTIVE</span>;
  }
  return <span className="badge badge-retired">RETIRED</span>;
}

function ItemLine({
  itemId,
  name,
  children,
  status,
}: {
  itemId: number;
  name: string;
  children: React.ReactNode;
  status?: "active" | "retired" | null;
}) {
  const src = getItemImageUrl(itemId);

  return (
    <div className="item-line">
      <Image
        src={src}
        alt={name}
        width={48}
        height={48}
        className="item-line-thumb"
        sizes="48px"
      />
      <div className="item-line-body">
        <p className="item-line-copy">
          {children}
          <StatusBadge kind={status ?? null} />
        </p>
      </div>
    </div>
  );
}

function TldrItem({
  itemId,
  name,
}: {
  itemId: number;
  name: string;
}) {
  const src = getItemImageUrl(itemId);
  return (
    <span className="patch-notes-tldr-pill" title={name}>
      <Image
        src={src}
        alt=""
        width={22}
        height={22}
        className="patch-notes-tldr-thumb"
        sizes="22px"
        aria-hidden
      />
    </span>
  );
}

export function PatchNotesContent() {
  return (
    <>
      <h1>ITEM PATCH NOTES</h1>
      <p className="patch-notes-sub">
        Current in-game stats. Prices are buy / sell in tickets. Effects match on-chain item
        definitions unless noted. Item art matches the in-game market.
      </p>

      <div className="legend">
        <h3 style={{ marginTop: 0 }}>Legend</h3>
        <ul>
          <li>
            <strong>Buy / Sell</strong> — ticket cost to purchase · tickets refunded on sell
          </li>
          <li>
            <strong>Score</strong> — bonus to that symbol&apos;s score in scoring patterns
          </li>
          <li>
            <strong>Prob</strong> — bonus percentage points to that symbol&apos;s roll weight
          </li>
          <li>
            <strong>Weight</strong> — lemon line uses flat weight points (same layer as prob bonuses)
          </li>
          <li>
            <strong>Anti-coin</strong> — reduces coin symbol weight (666 pressure); magnitude =
            strength
          </li>
          <li>
            <strong>Pattern mult</strong> — additive % to pattern payout multiplier
          </li>
          <li>
            <strong>Instant spins</strong> — consumable: adds that many spins immediately
          </li>
          <li>
            <strong>CHIP bonus</strong> — extra CHIP on diamond patterns (tier 1 / 2 / 3)
          </li>
          <li>
            <strong>Market</strong> — <strong>Active</strong> can roll on shop refresh;{" "}
            <strong>Retired</strong> no longer rolls (legacy copies may still exist)
          </li>
        </ul>
      </div>

      <h2>TL;DR</h2>
      <ul className="patch-notes-tldr-list">
        <li>
          <TldrItem itemId={41} name="Tricky Dice" />
          <span>
            <strong>New:</strong> <strong>Tricky Dice</strong> — Buy 4 · Sell 2 · cash-out on next
            666 (special effect).
          </span>
        </li>
        <li>
          <span className="patch-notes-tldr-icons" aria-hidden>
            <TldrItem itemId={10} name="Red Button" />
            <TldrItem itemId={23} name="Devil Seal" />
            <TldrItem itemId={19} name="Old Phone" />
            <TldrItem itemId={39} name="Knight Helmet" />
            <TldrItem itemId={24} name="Holy Grail" />
          </span>
          <span>
            <strong>Retired from market (5):</strong> <strong>Red Button</strong>,{" "}
            <strong>Devil Seal</strong> (instant spins); <strong>Old Phone</strong>,{" "}
            <strong>Knight Helmet</strong> (anti-coin); <strong>Holy Grail</strong> (pattern mult).
            Stats below still apply if you already own them.
          </span>
        </li>
        <li>
          <span className="patch-notes-tldr-icons" aria-hidden>
            <TldrItem itemId={17} name="Golden Globe" />
            <TldrItem itemId={31} name="Beer Can" />
            <TldrItem itemId={32} name="Memory Card" />
          </span>
          <span>
            <strong>Anti-coin</strong> still rolling: <strong>Golden Globe</strong>,{" "}
            <strong>Beer Can</strong>, <strong>Memory Card</strong>.
          </span>
        </li>
        <li>
          <span className="patch-notes-tldr-icons" aria-hidden>
            <TldrItem itemId={2} name="Milk" />
            <TldrItem itemId={8} name="Ace of Spades" />
            <TldrItem itemId={26} name="Rune" />
            <TldrItem itemId={27} name="Bloody knife" />
            <TldrItem itemId={35} name="Fake Dollar" />
            <TldrItem itemId={36} name="Bull Skull" />
          </span>
          <span>
            <strong>Diamond CHIP bonus:</strong> Milk &amp; Ace <strong>+1</strong> tier · Rune &amp;
            Bloody knife <strong>+2</strong> tier · Fake Dollar &amp; Bull Skull{" "}
            <strong>+3</strong> tier.
          </span>
        </li>
        <li>
          <TldrItem itemId={40} name="La Biblia" />
          <span>
            <strong>La Biblia</strong> scales on repeat buys: effective buy ={" "}
            <strong>1 + prior Biblia purchases this session</strong> (base price 1).
          </span>
        </li>
      </ul>

      <h2>Seven run — all active in market</h2>
      <ItemLine itemId={1} name="Chilly Pepper">
        <strong>Chilly Pepper</strong> — Buy 1 · Sell 0 · <strong>+14</strong> seven score
      </ItemLine>
      <ItemLine itemId={7} name="Nerd Glasses">
        <strong>Nerd Glasses</strong> — Buy 1 · Sell 0 · <strong>+6%</strong> seven prob
      </ItemLine>
      <ItemLine itemId={11} name="Ghost Mask">
        <strong>Ghost Mask</strong> — Buy 3 · Sell 1 · <strong>+12%</strong> seven prob
      </ItemLine>
      <ItemLine itemId={25} name="Hockey Mask">
        <strong>Hockey Mask</strong> — Buy 2 · Sell 1 · <strong>+21</strong> seven score
      </ItemLine>
      <ItemLine itemId={33} name="Ticket">
        <strong>Ticket</strong> — Buy 3 · Sell 2 · <strong>+28</strong> seven score
      </ItemLine>
      <ItemLine itemId={34} name="Devil Train">
        <strong>Devil Train</strong> — Buy 4 · Sell 2 · <strong>+16%</strong> seven prob
      </ItemLine>

      <h2>Diamond run — active · CHIP tier on diamond patterns</h2>
      <ItemLine itemId={2} name="Milk">
        <strong>Milk</strong> — Buy 1 · Sell 0 · <strong>+2</strong> diamond score · CHIP tier{" "}
        <strong>1</strong> (+1 unit)
      </ItemLine>
      <ItemLine itemId={8} name="Ace of Spades">
        <strong>Ace of Spades</strong> — Buy 1 · Sell 0 · <strong>+8%</strong> diamond prob · CHIP
        tier <strong>1</strong> (+1 unit)
      </ItemLine>
      <ItemLine itemId={26} name="Rune">
        <strong>Rune</strong> — Buy 3 · Sell 1 · <strong>+3</strong> diamond score · CHIP tier{" "}
        <strong>2</strong> (+2 units)
      </ItemLine>
      <ItemLine itemId={27} name="Bloody knife">
        <strong>Bloody knife</strong> — Buy 2 · Sell 1 · <strong>+14%</strong> diamond prob · CHIP
        tier <strong>2</strong> (+2 units)
      </ItemLine>
      <ItemLine itemId={35} name="Fake Dollar">
        <strong>Fake Dollar</strong> — Buy 4 · Sell 1 · <strong>+4</strong> diamond score · CHIP
        tier <strong>3</strong> (+3 units)
      </ItemLine>
      <ItemLine itemId={36} name="Bull Skull">
        <strong>Bull Skull</strong> — Buy 4 · Sell 2 · <strong>+20%</strong> diamond prob · CHIP
        tier <strong>3</strong> (+3 units)
      </ItemLine>

      <h2>Cherry run — all active</h2>
      <ItemLine itemId={3} name="Magic Dice">
        <strong>Magic Dice</strong> — Buy 1 · Sell 0 · <strong>+1</strong> cherry score
      </ItemLine>
      <ItemLine itemId={12} name="Skull">
        <strong>Skull</strong> — Buy 1 · Sell 0 · <strong>+8%</strong> cherry prob
      </ItemLine>
      <ItemLine itemId={13} name="Pig Bank">
        <strong>Pig Bank</strong> — Buy 2 · Sell 1 · <strong>+3</strong> cherry score
      </ItemLine>
      <ItemLine itemId={16} name="Weird Hand">
        <strong>Weird Hand</strong> — Buy 2 · Sell 1 · <strong>+14%</strong> cherry prob
      </ItemLine>
      <ItemLine itemId={20} name="Smelly Boots">
        <strong>Smelly Boots</strong> — Buy 3 · Sell 1 · <strong>+4</strong> cherry score
      </ItemLine>
      <ItemLine itemId={28} name="Devil Head">
        <strong>Devil Head</strong> — Buy 4 · Sell 2 · <strong>+20%</strong> cherry prob
      </ItemLine>

      <h2>Lemon run — all active</h2>
      <ItemLine itemId={4} name="Old Cassette">
        <strong>Old Cassette</strong> — Buy 1 · Sell 1 · <strong>+1</strong> lemon score
      </ItemLine>
      <ItemLine itemId={14} name="Old Wig">
        <strong>Old Wig</strong> — Buy 2 · Sell 1 · <strong>+2</strong> lemon score
      </ItemLine>
      <ItemLine itemId={29} name="Cigarettes">
        <strong>Cigarettes</strong> — Buy 2 · Sell 1 · <strong>+5</strong> lemon weight (not %)
      </ItemLine>
      <ItemLine itemId={30} name="Soul Contract">
        <strong>Soul Contract</strong> — Buy 3 · Sell 2 · <strong>+3</strong> lemon score
      </ItemLine>
      <ItemLine itemId={37} name="Fake Coin">
        <strong>Fake Coin</strong> — Buy 3 · Sell 2 · <strong>+6</strong> lemon weight (not %)
      </ItemLine>
      <ItemLine itemId={38} name="Pocket Watch">
        <strong>Pocket Watch</strong> — Buy 4 · Sell 2 · <strong>+4</strong> lemon score
      </ItemLine>

      <h2>Anti-coin run</h2>
      <ItemLine itemId={17} name="Golden Globe" status="active">
        <strong>Golden Globe</strong> — Buy 1 · Sell 0 · <strong>−8</strong> coin weight
      </ItemLine>
      <ItemLine itemId={31} name="Beer Can" status="active">
        <strong>Beer Can</strong> — Buy 2 · Sell 1 · <strong>−11</strong> coin weight
      </ItemLine>
      <ItemLine itemId={32} name="Memory Card" status="active">
        <strong>Memory Card</strong> — Buy 3 · Sell 2 · <strong>−20</strong> coin weight
      </ItemLine>
      <ItemLine itemId={19} name="Old Phone" status="retired">
        <strong>Old Phone</strong> — Buy 1 · Sell 0 · <strong>−4</strong> coin weight
      </ItemLine>
      <ItemLine itemId={39} name="Knight Helmet" status="retired">
        <strong>Knight Helmet</strong> — Buy 2 · Sell 1 · <strong>−6</strong> coin weight
      </ItemLine>

      <h2>Pattern multiplier</h2>
      <ItemLine itemId={5} name="Bat Boomerang" status="active">
        <strong>Bat Boomerang</strong> — Buy 1 · Sell 1 · <strong>+20%</strong> pattern mult
      </ItemLine>
      <ItemLine itemId={6} name="Holy Eye" status="active">
        <strong>Holy Eye</strong> — Buy 2 · Sell 1 · <strong>+40%</strong> pattern mult
      </ItemLine>
      <ItemLine itemId={15} name="Amulet" status="active">
        <strong>Amulet</strong> — Buy 3 · Sell 2 · <strong>+60%</strong> pattern mult
      </ItemLine>
      <ItemLine itemId={21} name="Bloody Wrench" status="active">
        <strong>Bloody Wrench</strong> — Buy 4 · Sell 2 · <strong>+90%</strong> pattern mult
      </ItemLine>
      <ItemLine itemId={22} name="Car Keys" status="active">
        <strong>Car Keys</strong> — Buy 5 · Sell 3 · <strong>+120%</strong> pattern mult
      </ItemLine>
      <ItemLine itemId={24} name="Holy Grail" status="retired">
        <strong>Holy Grail</strong> — Buy 7 · Sell 3 · <strong>+150%</strong> pattern mult
      </ItemLine>

      <h2>Instant spins</h2>
      <ItemLine itemId={9} name="Devil Onion" status="active">
        <strong>Devil Onion</strong> — Buy 1 · Sell 1 · <strong>+2</strong> instant spins
      </ItemLine>
      <ItemLine itemId={10} name="Red Button" status="retired">
        <strong>Red Button</strong> — Buy 1 · Sell 1 · <strong>+2</strong> instant spins
      </ItemLine>
      <ItemLine itemId={18} name="Pyramid" status="active">
        <strong>Pyramid</strong> — Buy 2 · Sell 2 · <strong>+3</strong> instant spins
      </ItemLine>
      <ItemLine itemId={23} name="Devil Seal" status="retired">
        <strong>Devil Seal</strong> — Buy 2 · Sell 2 · <strong>+4</strong> instant spins
      </ItemLine>

      <h2>666 / safety &amp; cash-out</h2>
      <ItemLine itemId={40} name="La Biblia" status="active">
        <strong>La Biblia</strong> — Buy <strong>1 + prior Biblia buys this session</strong> · Sell
        1 · blocks <strong>666</strong> pattern when equipped
      </ItemLine>
      <ItemLine itemId={41} name="Tricky Dice" status="active">
        <strong>Tricky Dice</strong> — Buy 4 · Sell 2 · <strong>Next 666 cashout</strong> gamble
      </ItemLine>

      <h2>Summary — market status</h2>
      <p>
        <strong>Instant spins — active:</strong> Devil Onion, Pyramid ·{" "}
        <strong>retired:</strong> Red Button, Devil Seal
      </p>
      <p>
        <strong>Anti-coin — active:</strong> Golden Globe, Beer Can, Memory Card ·{" "}
        <strong>retired:</strong> Old Phone, Knight Helmet
      </p>
      <p>
        <strong>Pattern mult — active:</strong> Bat Boomerang, Holy Eye, Amulet, Bloody Wrench, Car
        Keys · <strong>retired:</strong> Holy Grail
      </p>
      <p>
        Seven, diamond, cherry, lemon runs: <strong>all active</strong>. Safety: La Biblia, Tricky
        Dice — <strong>active</strong>.
      </p>

      <h2>Footnote</h2>
      <p style={{ fontSize: "0.88rem", color: "#a3a3a3" }}>
        Stats reflect live item definitions. <strong>Retired</strong> means the item does not roll on
        market refresh; owned copies keep these values. Item images are loaded from the same paths
        as the game client; override with{" "}
        <code style={{ fontSize: "0.8em" }}>NEXT_PUBLIC_ITEM_IMAGE_ORIGIN</code> or host files under{" "}
        <code style={{ fontSize: "0.8em" }}>/public/images/</code> and set the origin to{" "}
        <code style={{ fontSize: "0.8em" }}>local</code>.
      </p>
    </>
  );
}
