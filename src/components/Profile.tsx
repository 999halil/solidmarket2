import React, { useEffect, useState } from "react";
import { getSolidDataset, getThing, getStringNoLocale } from "@inrupt/solid-client";
import { FOAF } from "@inrupt/vocab-common-rdf";
import { useAuth } from "../context/AuthContext";

const Profile: React.FC = () => {
    const { session, isAuthenticated } = useAuth();
    const [name, setName] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!session.info.isLoggedIn) return;

            const profileDataset = await getSolidDataset(session.info.webId!, { fetch: session.fetch });
            const profileThing = getThing(profileDataset, session.info.webId!);
            const userName = profileThing ? getStringNoLocale(profileThing, FOAF.name) : null;
            setName(userName);
        };

        fetchProfile();
    }, [session]);

    if (!isAuthenticated) return <p>Please log in</p>;

    return (
        <div>
            <h2>Welcome, {name || "User"}!</h2>
            <p>Your WebID: {session.info.webId}</p>
        </div>
    );
};

export default Profile;
