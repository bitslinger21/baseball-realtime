import type { CSSProperties, ReactElement, ReactNode } from "react";
import "./Table.css";

interface ThProps {
  children?: ReactNode;
  align?: "left" | "center" | "right";
  style?: CSSProperties;
}

export function Th({ children, align = "center", style }: ThProps): ReactElement {
  return (
    <th className="tbl__th" style={{ textAlign: align, ...style }}>
      {children}
    </th>
  );
}

interface TdProps {
  children?: ReactNode;
  align?: "left" | "center" | "right";
  mono?: boolean;
  dim?: boolean;
  hot?: boolean;
  style?: CSSProperties;
}

export function Td({ children, align = "center", mono = true, dim = false, hot = false, style }: TdProps): ReactElement {
  const cls = ["tbl__td", mono && "tbl__td--mono", dim && "tbl__td--dim", hot && "tbl__td--hot"]
    .filter(Boolean)
    .join(" ");
  return (
    <td className={cls} style={{ textAlign: align, ...style }}>
      {children}
    </td>
  );
}

interface TrProps {
  children?: ReactNode;
  hover?: boolean;
  style?: CSSProperties;
}

export function Tr({ children, hover = true, style }: TrProps): ReactElement {
  return (
    <tr className={hover ? "tbl__tr tbl__tr--hover" : "tbl__tr"} style={style}>
      {children}
    </tr>
  );
}
