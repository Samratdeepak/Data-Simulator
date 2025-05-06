import axios from "axios";

const handleProtectedRequest = async () => {
    const token = await auth.currentUser.getIdToken();
    const response = await axios.get("http://localhost:8000/protected-route", {
        headers: { Authorization: `Bearer ${token}` }
    });
    console.log(response.data);
};