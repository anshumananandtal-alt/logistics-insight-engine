import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  components: {
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
        },
      },
    },
  },
});

export default theme;