// src/components/ui/Table.jsx
import { clsx } from 'clsx';

export function Table({ children, className }) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-gray-200">
      <table className={clsx('w-full text-sm text-start', className)}>
        {children}
      </table>
    </div>
  );
}

export function Thead({ children }) {
  return (
    <thead className="bg-gray-50 border-b border-gray-200">
      {children}
    </thead>
  );
}

export function Tbody({ children }) {
  return (
    <tbody className="divide-y divide-gray-100 bg-white">
      {children}
    </tbody>
  );
}

export function Th({ children, className, ...props }) {
  return (
    <th
      scope="col"
      className={clsx(
        'px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-start',
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({ children, className, ...props }) {
  return (
    <td
      className={clsx('px-4 py-3 text-gray-700 align-middle', className)}
      {...props}
    >
      {children}
    </td>
  );
}

export function Tr({ children, className, onClick, ...props }) {
  return (
    <tr
      onClick={onClick}
      className={clsx(
        'transition-colors',
        onClick && 'cursor-pointer hover:bg-blue-50/50',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
}
