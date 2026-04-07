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
        return { dx, dy, len, angleRad };
    }, [from.x, from.y, to.x, to.y]);

    // RN transforms rotate around the element center.
    // We position the element center at the midpoint between from/to.
    const midX = from.x + metrics.dx / 2;
    const midY = from.y + metrics.dy / 2;

    return (
        <View
            pointerEvents="none"
            style={[
                styles.line,
                {
                    left: midX - metrics.len / 2,
                    top: midY,
                    width: Math.max(1, metrics.len),
                    transform: [{ rotate: `${metrics.angleRad}rad` }],
                },
            ]}
        />
    );
}

const styles = StyleSheet.create({
    line: {
        position: "absolute",
        height: 0,
        borderRadius: 999,
        borderStyle: "dashed",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.18)",
        opacity: 0.9,
    },
});
