import { useState } from 'react';

function Versions(): React.JSX.Element {
  const [versions] = useState(window.electron.process.versions);

  return (
    <dl className="mt-4 space-y-1 text-[10px] text-ot-foreground/70">
      <div className="flex justify-between">
        <dt className="uppercase tracking-[0.18em] text-ot-foreground/60">
          Electron
        </dt>
        <dd className="font-medium">v{versions.electron}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="uppercase tracking-[0.18em] text-ot-foreground/60">
          Chromium
        </dt>
        <dd className="font-medium">v{versions.chrome}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="uppercase tracking-[0.18em] text-ot-foreground/60">
          Node
        </dt>
        <dd className="font-medium">v{versions.node}</dd>
      </div>
    </dl>
  );
}

export default Versions;
