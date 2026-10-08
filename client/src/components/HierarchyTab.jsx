import React, { useState } from 'react';
import { ChevronRight, ChevronDown, AlertTriangle, Layers, Zap } from 'lucide-react';

function TreeNode({ node, levelDepth = 0 }) {
  const [expanded, setExpanded] = useState(levelDepth < 2); // expand top 2 levels by default
  const hasChildren = node.children && node.children.length > 0;

  const getLevelColor = (level) => {
    switch (level) {
      case 'zone': return '#2563eb';
      case 'circle': return '#0284c7';
      case 'division': return '#0d9488';
      case 'subdivision': return '#16a34a';
      case 'substation': return '#ca8a04';
      case 'feeder': return '#ea580c';
      case 'dt': return '#9333ea';
      default: return '#64748b';
    }
  };

  return (
    <div style={{ marginLeft: levelDepth > 0 ? '1.25rem' : 0, borderLeft: levelDepth > 0 ? '1px dashed var(--border-subtle)' : 'none', paddingLeft: levelDepth > 0 ? '0.75rem' : 0, marginTop: '0.35rem' }}>
      <div
        onClick={() => hasChildren && setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 0.6rem',
          borderRadius: '6px',
          cursor: hasChildren ? 'pointer' : 'default',
          backgroundColor: expanded && hasChildren ? '#f1f5f9' : 'transparent',
          fontSize: '0.85rem'
        }}
      >
        {hasChildren ? (
          expanded ? <ChevronDown size={14} color="var(--text-muted)" /> : <ChevronRight size={14} color="var(--text-muted)" />
        ) : (
          <span style={{ width: 14, height: 14, display: 'inline-block' }} />
        )}

        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            padding: '0.1rem 0.4rem',
            borderRadius: '4px',
            backgroundColor: `${getLevelColor(node.level)}15`,
            color: getLevelColor(node.level)
          }}
        >
          {node.level}
        </span>

        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
          {node.name}
        </span>
        <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          ({node.code})
        </code>

        {/* Meters counter pill */}
        <span className="badge" style={{ marginLeft: 'auto', backgroundColor: '#f1f5f9', color: 'var(--text-secondary)' }}>
          {node.meterCount} meters
        </span>

        {/* Faulty counter if any */}
        {node.statusCounts?.Faulty > 0 && (
          <span className="badge badge-faulty" style={{ padding: '0.1rem 0.4rem' }}>
            {node.statusCounts.Faulty} faulty
          </span>
        )}

        {/* Data Quality Warning flags */}
        {node.dataQuality?.isUnknown && (
          <span className="badge" style={{ backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fef3c7' }} title="Node has missing name or code">
            <AlertTriangle size={11} /> Unknown
          </span>
        )}

        {node.dataQuality?.hasConflict && (
          <span className="badge" style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fee2e2' }} title="Alias collision on DT-007">
            <AlertTriangle size={11} /> Alias Collision
          </span>
        )}
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children.map((child, i) => (
            <TreeNode key={`${child.path}_${i}`} node={child} levelDepth={levelDepth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function HierarchyTab({ hierarchyData }) {
  const [filterText, setFilterText] = useState('');

  if (!hierarchyData || !hierarchyData.tree) {
    return <div className="card">Loading network hierarchy tree...</div>;
  }

  const { tree, summary } = hierarchyData;

  return (
    <div>
      {/* Hierarchy Overview Header */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} color="var(--primary)" /> 7-Tier Distribution Network Topology
            </h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Zone → Circle → Division → Subdivision → Substation → Feeder → DT
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem' }}>
            <div className="badge badge-installed">
              Total Meters: {summary.totalMeters}
            </div>
            <div className="badge" style={{ backgroundColor: '#f8fafc', border: '1px solid var(--border-subtle)' }}>
              Total Network Nodes: {summary.totalNodes}
            </div>
            {summary.metersWithMissingNames > 0 && (
              <div className="badge badge-faulty">
                {summary.metersWithMissingNames} with Missing Data
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tree Container */}
      <div className="card">
        <div style={{ maxHeight: '700px', overflowY: 'auto', paddingRight: '0.5rem' }}>
          {tree.map((rootNode, i) => (
            <TreeNode key={`${rootNode.path}_${i}`} node={rootNode} levelDepth={0} />
          ))}
        </div>
      </div>
    </div>
  );
}
