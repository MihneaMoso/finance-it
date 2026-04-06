/**
 * RoadmapPath — draws a sketchy dashed path between two points.
 *
 * Note: this is a lightweight approximation of Duolingo paths using plain Views.
 * If we want true curves later, we can swap to react-native-svg without changing
 * the data model (we already store normalized node coordinates).
 */

import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";

export function RoadmapPath({
    from,
    to,
}: {
    from: { x: number; y: number };
    to: { x: number; y: number };
}) {
    const metrics = useMemo(() => {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angleRad = Math.atan2(dy, dx);
        return { len, angleRad };
    }, [from.x, from.y, to.x, to.y]);

    return (
        <View
            pointerEvents="none"
            style={[
                styles.line,
                {
                    left: from.x,
                    top: from.y,
                    width: Math.max(1, metrics.len),
                    transform: [
                        { rotate: `${metrics.angleRad}rad` },
                        { translateY: -1 },
                    ],
                },
            ]}
        />
    );
}

const styles = StyleSheet.create({
    line: {
        position: "absolute",
        height: 2,
        borderRadius: 999,
        borderStyle: "dashed",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.16)",
        opacity: 0.9,
    },
});
