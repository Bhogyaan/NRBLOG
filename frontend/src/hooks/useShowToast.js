// hooks/useShowToast.js
import { toast } from 'react-toastify';
import { useCallback } from 'react';

const useShowToast = () => {
  const showToast = useCallback(
    (message, description = "", type = "default") => {
      const toastOptions = {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      };

      const fullMessage = `${message}${description ? ` - ${description}` : ""}`;

      switch (type) {
        case 'success':
          toast.success(fullMessage, toastOptions);
          break;
        case 'error':
          toast.error(fullMessage, toastOptions);
          break;
        case 'warning':
          toast.warning(fullMessage, toastOptions);
          break;
        case 'info':
          toast.info(fullMessage, toastOptions);
          break;
        case 'default':
        default:
          toast(fullMessage, toastOptions);
          break;
      }
    },
    []
  );

  return showToast;
};

export default useShowToast;
