import { Dialog } from "./Dialog";

const ROWS: Array<[keys: string[], description: string]> = [
  [["1", "2", "3"], "숫자 1, 2, 3"],
  [["Q", "W", "E"], "숫자 4, 5, 6"],
  [["A", "S", "D"], "숫자 7, 8, 9"],
  [["Z", "X", "C"], "*, 0, #"],
  [["↑", "↓", "←", "→"], "이동"],
  [["Space"], "OK"],
  [["Backspace"], "CLR"],
];

export const HelpDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => (
  <Dialog open={open} title="조작 도움말" onClose={onClose} className="help-dialog">
    <p>화면 아래 키패드를 눌러도 되고, PC에서는 키보드를 쓸 수 있습니다.</p>
    <table>
      <tbody>
        {ROWS.map(([keys, description]) => (
          <tr key={description}>
            <td>
              {keys.map(key => (
                <kbd key={key}>{key}</kbd>
              ))}
            </td>
            <td>{description}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <footer className="dialog-actions">
      <button className="secondary-command" type="button" onClick={onClose}>
        닫기
      </button>
    </footer>
  </Dialog>
);
