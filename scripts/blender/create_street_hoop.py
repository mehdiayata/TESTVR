"""Build the street-court hoop in metres and export it for Three.js."""

from math import cos, pi, sin
from pathlib import Path

import bpy
from mathutils import Vector


OUTPUT = Path('/workspace/public/assets/models/street-hoop.glb')
RIM_RADIUS = 0.34
RIM_HEIGHT = 3.05

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)


def point(x, y, z):
    """Map Three.js X/right, Y/up, Z/depth into Blender's Z-up axes."""
    return Vector((x, -z, y))


def material(name, color, metallic=0.0, roughness=0.6):
    value = bpy.data.materials.new(name)
    value.diffuse_color = (*color, 1.0)
    value.use_nodes = True
    shader = value.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1.0)
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Roughness'].default_value = roughness
    return value


steel = material('Powder-coated dark steel', (0.09, 0.13, 0.16), 0.68, 0.42)
glass = material('Frosted backboard', (0.73, 0.82, 0.85), 0.05, 0.32)
paint = material('Backboard markings', (0.93, 0.42, 0.16), 0.08, 0.5)
rim_paint = material('Orange steel rim', (0.78, 0.19, 0.035), 0.48, 0.37)
rope = material('Woven white net', (0.9, 0.91, 0.86), 0.0, 0.86)
rubber = material('Pole padding', (0.055, 0.09, 0.12), 0.0, 0.88)


def box(name, center, size, surface, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=point(*center))
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new('Soft edges', 'BEVEL')
        modifier.width = bevel
        modifier.segments = 2
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        obj.data.use_auto_smooth = True
        normal = obj.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
        bpy.ops.object.modifier_apply(modifier=normal.name)
    obj.data.materials.append(surface)
    return obj


def rod(name, start, end, radius, surface, vertices=10):
    origin = point(*start)
    finish = point(*end)
    direction = finish - origin
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=direction.length,
        location=(origin + finish) / 2,
    )
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = direction.to_track_quat('Z', 'Y').to_euler()
    obj.data.materials.append(surface)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


# The whole asset is local to the rim centre; the browser places it at the court hoop.
rod('Main steel post', (0, -3.02, -1.65), (0, 0.62, -1.65), 0.105, steel, 14)
box('Ground base', (0, -2.99, -1.65), (0.58, 0.12, 0.62), steel, 0.025)
box('Post safety padding', (0, -1.72, -1.65), (0.29, 1.15, 0.29), rubber, 0.045)
rod('Upper support', (0, 0.58, -1.65), (0, 0.53, -0.61), 0.065, steel)
rod('Diagonal support', (0, -0.25, -1.65), (0, 0.43, -0.6), 0.052, steel)

box('Backboard', (0, 0.45, -0.55), (1.82, 1.07, 0.07), glass, 0.014)
for x in (-0.93, 0.93):
    box('Backboard side frame', (x, 0.45, -0.55), (0.045, 1.13, 0.09), steel, 0.009)
for y in (-0.11, 1.01):
    box('Backboard top or bottom frame', (0, y, -0.55), (1.89, 0.045, 0.09), steel, 0.009)

for x in (-0.29, 0.29):
    box('Target square side', (x, 0.32, -0.507), (0.024, 0.43, 0.007), paint)
for y in (0.105, 0.535):
    box('Target square horizontal', (0, y, -0.507), (0.6, 0.024, 0.007), paint)

for x in (-0.14, 0.14):
    rod('Rim support', (x, 0, -0.5), (x, 0, -0.32), 0.024, steel, 8)

bpy.ops.mesh.primitive_torus_add(major_segments=48, minor_segments=8,
                                  location=point(0, 0, 0),
                                  major_radius=RIM_RADIUS, minor_radius=0.026)
rim = bpy.context.object
rim.name = 'Steel rim'
rim.data.materials.append(rim_paint)
for polygon in rim.data.polygons:
    polygon.use_smooth = True


net_parts = []


def cord(name, start, end):
    net_parts.append(rod(name, start, end, 0.0055, rope, 6))


def ring_point(angle, radius, height):
    return (radius * cos(angle), height, radius * sin(angle))


for index in range(12):
    angle = index * 2 * pi / 12
    next_angle = (index + 1) * 2 * pi / 12
    knots = [
        ring_point(angle, RIM_RADIUS, -0.025),
        ring_point(angle + pi / 12, 0.29, -0.16),
        ring_point(angle, 0.23, -0.31),
        ring_point(angle + pi / 12, 0.17, -0.48),
    ]
    for segment in range(len(knots) - 1):
        cord('Net diagonal', knots[segment], knots[segment + 1])
    for radius, height, twist in ((0.29, -0.16, pi / 12),
                                  (0.23, -0.31, 0),
                                  (0.17, -0.48, pi / 12)):
        cord('Net horizontal', ring_point(angle + twist, radius, height),
             ring_point(next_angle + twist, radius, height))

bpy.ops.object.select_all(action='DESELECT')
for part in net_parts:
    part.select_set(True)
bpy.context.view_layer.objects.active = net_parts[0]
bpy.ops.object.join()
net = bpy.context.object
net.name = 'BasketNet'
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(OUTPUT), export_format='GLB',
                          use_selection=True, export_apply=True)
print(f'Exported {OUTPUT}')
